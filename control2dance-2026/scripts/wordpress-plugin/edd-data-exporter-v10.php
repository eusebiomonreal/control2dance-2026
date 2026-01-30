<?php
/**
 * Plugin Name: EDD Data Exporter (v10 - TRANSACTIONS INSPECTOR)
 * Description: Inspecciona a fondo la tabla wp_edd_order_transactions
 * Version: 10.0.0
 */

if (!defined('ABSPATH')) exit;

class EDD_Data_Exporter_V10 {
    
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_post_export_edd_data_v10', [$this, 'handle_export']);
    }
    
    public function add_admin_menu() {
        add_menu_page('EDD Export v10', 'EDD Export v10', 'manage_options', 'edd-data-exporter-v10', [$this, 'admin_page'], 'dashicons-database-view', 100);
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>🔍 Inspector de Transacciones (v10)</h1>
            <p>Este plugin va a listar TODAS las columnas y datos de la tabla <code>wp_edd_order_transactions</code>, que es donde sospechamos que están los IDs de Stripe.</p>
            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <input type="hidden" name="action" value="export_edd_data_v10">
                <?php wp_nonce_field('export_edd_data_v10', 'export_nonce'); ?>
                <?php submit_button('🚀 Inspeccionar Tabla de Transacciones'); ?>
            </form>
        </div>
        <?php
    }
    
    public function handle_export() {
        if (!current_user_can('manage_options')) wp_die('Permisos insuficientes');
        check_admin_referer('export_edd_data_v10', 'export_nonce');
        
        global $wpdb;
        $table = "{$wpdb->prefix}edd_order_transactions";
        
        $diag = [
            'exported_at' => current_time('mysql'),
            'columns' => $wpdb->get_results("SHOW COLUMNS FROM $table"),
            'sample_data' => $wpdb->get_results("SELECT * FROM $table ORDER BY id DESC LIMIT 100"),
        ];
        
        $json = json_encode($diag, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="edd-transactions-v10-' . date('Y-m-d-His') . '.json"');
        echo $json; exit;
    }
}
new EDD_Data_Exporter_V10();
